import { CalendarOutlined, QuestionCircleOutlined, YoutubeOutlined } from '@ant-design/icons';
import { Table, Tag, Row, Tooltip, Button, Typography, Select, message } from 'antd';
import { withSession, GithubUserLink, PageLayout } from 'components';
import { dateRenderer } from 'components/Table';
import withCourseData from 'components/withCourseData';
import { useState, useMemo } from 'react';
import { CourseEvent, CourseService, CourseTaskDetails } from 'services/course';
import { CoursePageProps } from 'services/models';
import css from 'styled-jsx/css';
import moment from 'moment-timezone';
import { DEFAULT_TIMEZONE, TIMEZONES } from '../../configs/timezones';
import { useAsync } from 'react-use';

const { Text } = Typography;

enum EventTypeColor {
  deadline = 'red',
  test = '#63ab91',
  jstask = 'green',
  htmltask = 'green',
  htmlcssacademy = 'green',
  externaltask = 'green',
  codewars = 'green',
  codejam = 'green',
  newtask = 'green',
  lecture = 'blue',
  lecture_online = 'blue',
  lecture_offline = 'blue',
  lecture_mixed = 'blue',
  lecture_self_study = 'blue',
  info = '#ff7b00',
  warmup = '#63ab91',
  meetup = '#bde04a',
  workshop = '#bde04a',
  interview = '#63ab91',
}

const TaskTypes = {
  deadline: 'deadline',
  test: 'test',
  newtask: 'newtask',
  lecture: 'lecture',
};

const EventTypeToName = {
  lecture_online: 'online lecture',
  lecture_offline: 'offline lecture',
  lecture_mixed: 'mixed lecture',
  lecture_self_study: 'self study',
  warmup: 'warm-up',
  jstask: 'js task',
  htmltask: 'html task',
  codejam: 'code jam',
  externaltask: 'external task',
  htmlcssacademy: 'html/css academy',
  'codewars:stage1': 'codewars',
  'codewars:stage2': 'codewars',
};

export function SchedulePage(props: CoursePageProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CourseEvent[]>([]);
  const [timeZone, setTimeZone] = useState(DEFAULT_TIMEZONE);
  const courseService = useMemo(() => new CourseService(props.course.id), [props.course.id]);
  const startOfToday = moment().startOf('day');

  useAsync(async () => {
    try {
      setLoading(true);
      const [events, tasks] = await Promise.all([
        courseService.getCourseEvents(),
        courseService.getCourseTasksDetails(),
      ]);
      const data = events
        .concat(
          tasks.reduce((acc: Array<CourseEvent>, task: CourseTaskDetails) => {
            if (task.type !== TaskTypes.test) {
              acc.push(createCourseEventFromTask(task, task.type));
            }
            acc.push(
              createCourseEventFromTask(task, task.type === TaskTypes.test ? TaskTypes.test : TaskTypes.deadline),
            );
            return acc;
          }, []),
        )
        .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
      setData(data);
    } catch {
      message.error('An error occured. Please try later.');
    } finally {
      setLoading(false);
    }
  }, [courseService]);

  return (
    <PageLayout loading={loading} title="Schedule" githubId={props.session.githubId}>
      <Row
        style={{
          display: 'flex',
          flexFlow: 'row',
          justifyContent: 'center',
          alignItems: 'baseline',
          textAlign: 'center',
        }}
      >
        <p>
          <Text type="danger">This is a draft version! </Text> Please see the actual schedule here:
        </p>
        <Button
          style={{ marginLeft: 8 }}
          type="danger"
          icon={<CalendarOutlined />}
          target="_blank"
          href="https://docs.google.com/spreadsheets/d/1oM2O8DtjC0HodB3j7hcIResaWBw8P18tXkOl1ymelvE/edit#gid=1509181302"
        >
          See Schedule
        </Button>
      </Row>
      <Row justify="space-between">
        <Select
          style={{ width: 200 }}
          placeholder="Please select a timezone"
          defaultValue={timeZone}
          onChange={setTimeZone}
        >
          {TIMEZONES.map(tz => (
            <Select.Option key={tz} value={tz}>
              {tz}
            </Select.Option>
          ))}
        </Select>
        <Button icon={<CalendarOutlined />} href={`/api/course/${props.course.id}/events/ical`}>
          Events iCal
        </Button>
      </Row>
      <Table
        rowKey={record => (record.event.type === TaskTypes.deadline ? `${record.id}d` : record.id).toString()}
        pagination={false}
        size="small"
        dataSource={data}
        rowClassName={record => (moment(record.dateTime).isBefore(startOfToday) ? 'rs-table-row-disabled' : '')}
        columns={[
          { title: 'Date', width: 120, dataIndex: 'dateTime', render: dateRenderer },
          { title: 'Time', width: 60, dataIndex: 'dateTime', render: timeZoneRenderer(timeZone) },
          {
            title: 'Type',
            width: 100,
            dataIndex: ['event', 'type'],
            render: (value: keyof typeof EventTypeColor) => (
              <Tag color={EventTypeColor[value]}>{EventTypeToName[value] || value}</Tag>
            ),
          },
          {
            title: 'Place',
            dataIndex: 'place',
            render: (value: string) => {
              return value === 'Youtube Live' ? (
                <div>
                  <YoutubeOutlined /> {value}{' '}
                  <Tooltip title="Ссылка будет в Discord">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </div>
              ) : (
                value
              );
            },
          },
          {
            title: 'Name',
            dataIndex: ['event', 'name'],
            render: (value: string, record) => {
              return record.event.descriptionUrl ? (
                <a target="_blank" href={record.event.descriptionUrl}>
                  {value}
                </a>
              ) : (
                value
              );
            },
          },
          {
            title: 'Broadcast Url',
            width: 140,
            dataIndex: 'broadcastUrl',
            render: (url: string) =>
              url ? (
                <a target="_blank" href={url}>
                  Link
                </a>
              ) : (
                ''
              ),
          },
          {
            title: 'Organizer',
            width: 140,
            dataIndex: ['organizer', 'githubId'],
            render: (value: string) => (value ? <GithubUserLink value={value} /> : ''),
          },
          {
            title: 'Details Url',
            dataIndex: 'detailsUrl',
            render: (url: string) =>
              url ? (
                <a target="_blank" href={url}>
                  Details
                </a>
              ) : (
                ''
              ),
          },
          { title: 'Comment', dataIndex: 'comment' },
        ]}
      />
      <style jsx>{styles}</style>
    </PageLayout>
  );
}

const timeZoneRenderer = (timeZone: string) => (value: string) =>
  value
    ? moment(value, 'YYYY-MM-DD HH:mmZ')
        .tz(timeZone)
        .format('HH:mm')
    : '';

const createCourseEventFromTask = (task: CourseTaskDetails, type: string): CourseEvent => {
  return {
    id: task.id,
    dateTime: (type === TaskTypes.deadline ? task.studentEndDate : task.studentStartDate) || '',
    event: {
      type: type,
      name: task.name,
      descriptionUrl: task.descriptionUrl,
    },
    organizer: {
      githubId: task.taskOwner ? task.taskOwner.githubId : '',
    },
  } as CourseEvent;
};

const styles = css`
  :global(.rs-table-row-disabled) {
    opacity: 0.5;
  }
`;

export default withCourseData(withSession(SchedulePage));
